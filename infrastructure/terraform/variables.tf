variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "deepfake-otop"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# ─── ECS / Compute ────────────────────────────────────────────────────────────

variable "api_cpu" {
  description = "CPU units for the API container (1024 = 1 vCPU)"
  type        = number
  default     = 2048
}

variable "api_memory" {
  description = "Memory in MiB for the API container"
  type        = number
  default     = 4096
}

variable "worker_instance_type" {
  description = "EC2 instance type for the Celery GPU worker"
  type        = string
  default     = "g4dn.xlarge"  # 1× NVIDIA T4 GPU
}

variable "worker_min_count" {
  description = "Minimum number of Celery workers"
  type        = number
  default     = 1
}

variable "worker_max_count" {
  description = "Maximum number of Celery workers"
  type        = number
  default     = 4
}

# ─── Storage ──────────────────────────────────────────────────────────────────

variable "s3_bucket_name" {
  description = "Globally unique S3 bucket name for media files"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"  # US, Europe, Asia
}

# ─── Database / Cache ─────────────────────────────────────────────────────────

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.small"
}

# ─── Container images ─────────────────────────────────────────────────────────

variable "api_image_tag" {
  description = "Docker image tag for the API service"
  type        = string
  default     = "latest"
}

variable "worker_image_tag" {
  description = "Docker image tag for the Celery worker service"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Docker image tag for the frontend service"
  type        = string
  default     = "latest"
}

# ─── Secrets ──────────────────────────────────────────────────────────────────

variable "secret_key" {
  description = "Application secret key"
  type        = string
  sensitive   = true
}

variable "redis_auth_token" {
  description = "Auth token for Redis TLS connections (minimum 16 characters)"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "API key clients must send in the X-API-Key header"
  type        = string
  sensitive   = true
}

# ─── Domain ───────────────────────────────────────────────────────────────────

variable "domain_name" {
  description = "Root domain name (must exist as a Route 53 hosted zone, or one will be created)"
  type        = string
  default     = "otopgestion.com"
}

variable "api_subdomain" {
  description = "Subdomain for the API backend"
  type        = string
  default     = "api"
}

variable "app_subdomain" {
  description = "Subdomain for the frontend web app"
  type        = string
  default     = "app"
}
