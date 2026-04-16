output "api_url" {
  description = "Public HTTPS URL for the API (api.otopgestion.com)"
  value       = local.api_url
}

output "app_url" {
  description = "Public HTTPS URL for the frontend app (app.otopgestion.com)"
  value       = local.app_url
}

output "alb_dns_name" {
  description = "Raw DNS name of the Application Load Balancer"
  value       = aws_lb.api.dns_name
}

output "name_servers" {
  description = "Route 53 name servers — set these as NS records at your registrar"
  value       = aws_route53_zone.main.name_servers
}

output "cloudfront_domain" {
  description = "CloudFront domain for media assets"
  value       = aws_cloudfront_distribution.media.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for media files"
  value       = aws_s3_bucket.media.bucket
}

output "ecr_api_url" {
  description = "ECR repository URL for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_worker_url" {
  description = "ECR repository URL for the worker image"
  value       = aws_ecr_repository.worker.repository_url
}

output "redis_endpoint" {
  description = "Redis endpoint (ElastiCache)"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}
