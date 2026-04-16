# ─── ECS Cluster ──────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ─── IAM roles ────────────────────────────────────────────────────────────────

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The managed ECSTaskExecutionRolePolicy does NOT include SSM GetParameter.
# This inline policy grants read access to all SSM SecureString parameters
# under /<project_name>/* so containers can use the `secrets` block.
resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "ssm-secrets"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ]
      Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# M19: Restrict S3 permissions to specific prefixes — no wildcard on entire bucket
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.media.arn}/uploads/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.media.arn}/outputs/*"
      }
    ]
  })
}

# ─── CloudWatch Logs ──────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project_name}/api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project_name}/worker"
  retention_in_days = 30
}

# ─── ALB ──────────────────────────────────────────────────────────────────────

resource "aws_lb" "api" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project_name}-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# HTTP listener — permanently redirects to HTTPS.
resource "aws_lb_listener" "api_http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener — uses the ACM certificate issued for api.otopgestion.com.
resource "aws_lb_listener" "api_https" {
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# ─── ECS Task Definition — API (Fargate) ─────────────────────────────────────

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
    portMappings = [{ containerPort = 8000, protocol = "tcp" }]

    environment = [
      { name = "APP_ENV",           value = var.environment },
      { name = "STORAGE_BACKEND",   value = "s3" },
      { name = "S3_BUCKET_NAME",    value = var.s3_bucket_name },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "CLOUDFRONT_DOMAIN", value = aws_cloudfront_distribution.media.domain_name },
      { name = "CELERY_BROKER_URL", value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0" },
      { name = "REDIS_URL",         value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0" },
      { name = "EXTERNAL_BASE_URL", value = local.api_url },
      { name = "CORS_ORIGINS",      value = local.app_url },
    ]

    secrets = [
      { name = "SECRET_KEY", valueFrom = aws_ssm_parameter.secret_key.arn },
      { name = "API_KEY",    valueFrom = aws_ssm_parameter.api_key.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval    = 30
      timeout     = 10
      retries     = 3
      startPeriod = 60
    }
  }])
}

# ─── ECS Service — API ────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.api_https]
}

# ─── ECS Task Definition — Celery GPU Worker (EC2) ───────────────────────────
#
# The worker runs on EC2 with GPU (g4dn) rather than Fargate because Fargate
# does not support GPU workloads.  An Auto Scaling Group manages the instances;
# the task definition is registered here so ECS can schedule tasks onto them.

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project_name}-worker"
  requires_compatibilities = ["EC2"]
  network_mode             = "bridge"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # Request one GPU per task
  placement_constraints {
    type       = "memberOf"
    expression = "attribute:ecs.instance-type =~ g4dn.*"
  }

  container_definitions = jsonencode([{
    name  = "worker"
    image = "${aws_ecr_repository.worker.repository_url}:${var.worker_image_tag}"

    # Expose the T4 GPU to the container runtime
    resourceRequirements = [
      { type = "GPU", value = "1" }
    ]

    environment = [
      { name = "APP_ENV",           value = var.environment },
      { name = "STORAGE_BACKEND",   value = "s3" },
      { name = "S3_BUCKET_NAME",    value = var.s3_bucket_name },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "CLOUDFRONT_DOMAIN", value = aws_cloudfront_distribution.media.domain_name },
      { name = "CELERY_BROKER_URL", value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0" },
      { name = "REDIS_URL",         value = "rediss://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0" },
      { name = "EXTERNAL_BASE_URL",     value = local.api_url },
      { name = "CELERY_RESULT_EXPIRES", value = "86400" },
    ]

    secrets = [
      { name = "SECRET_KEY", valueFrom = aws_ssm_parameter.secret_key.arn },
      { name = "API_KEY",    valueFrom = aws_ssm_parameter.api_key.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.worker.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "worker"
      }
    }

    # Memory/CPU managed at the instance level for EC2 launch type
    memory            = 14000
    memoryReservation = 8000
    cpu               = 3072
  }])
}

# ─── IAM Instance Profile for GPU worker EC2 instances ───────────────────────

resource "aws_iam_role" "worker_instance" {
  name = "${var.project_name}-worker-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "worker_instance_ecs" {
  role       = aws_iam_role.worker_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_role_policy_attachment" "worker_instance_ssm" {
  role       = aws_iam_role.worker_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "worker" {
  name = "${var.project_name}-worker"
  role = aws_iam_role.worker_instance.name
}

# ─── Launch Template for GPU worker instances ─────────────────────────────────
#
# Uses the official Amazon ECS-optimized GPU AMI (us-east-1).
# Update the AMI ID when upgrading the ECS agent or CUDA version.

data "aws_ami" "ecs_gpu" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-gpu-hvm-*-x86_64-ebs"]
  }
}

resource "aws_launch_template" "worker" {
  name_prefix   = "${var.project_name}-worker-"
  image_id      = data.aws_ami.ecs_gpu.id
  instance_type = var.worker_instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.worker.arn
  }

  # M18: Worker instances must use the worker security group, not the API SG
  vpc_security_group_ids = [aws_security_group.worker.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.main.name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_GPU_SUPPORT=true >> /etc/ecs/ecs.config
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "${var.project_name}-worker" }
  }
}

# ─── Auto Scaling Group for GPU worker instances ──────────────────────────────

resource "aws_autoscaling_group" "worker" {
  name                = "${var.project_name}-worker-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  min_size            = var.worker_min_count
  max_size            = var.worker_max_count
  desired_capacity    = var.worker_min_count

  launch_template {
    id      = aws_launch_template.worker.id
    version = "$Latest"
  }

  tag {
    key                 = "AmazonECSManaged"
    value               = ""
    propagate_at_launch = true
  }
}

# ─── ECS Capacity Provider for GPU worker ASG ─────────────────────────────────

resource "aws_ecs_capacity_provider" "worker" {
  name = "${var.project_name}-worker-cp"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.worker.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 1
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.worker.name]
}

# ─── ECS Service — Celery Worker ─────────────────────────────────────────────

resource "aws_ecs_service" "worker" {
  name            = "${var.project_name}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_min_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.worker.name
    weight            = 1
    base              = 0
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  depends_on = [aws_ecs_cluster_capacity_providers.main]
}

# ─── SSM Parameter Store ──────────────────────────────────────────────────────

resource "aws_ssm_parameter" "secret_key" {
  name  = "/${var.project_name}/secret_key"
  type  = "SecureString"
  value = var.secret_key
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/${var.project_name}/api_key"
  type  = "SecureString"
  value = var.api_key
}
