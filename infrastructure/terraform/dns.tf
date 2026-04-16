# ─── Route 53 Hosted Zone ─────────────────────────────────────────────────────
#
# If your domain is already registered and you have a hosted zone in Route 53,
# import it instead of creating a new one:
#   terraform import aws_route53_zone.main <HOSTED_ZONE_ID>

resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# ─── ACM Certificate ──────────────────────────────────────────────────────────
#
# A single certificate covers both subdomains (SANs).
# CloudFront requires ACM certificates in us-east-1.  If you deploy the rest
# of the stack in another region, add a second provider alias for us-east-1
# and attach it to this resource.

resource "aws_acm_certificate" "main" {
  domain_name               = "${var.api_subdomain}.${var.domain_name}"
  subject_alternative_names = ["${var.app_subdomain}.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# ─── DNS validation records ───────────────────────────────────────────────────

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ─── A record: api.otopgestion.com → ALB ─────────────────────────────────────

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "${var.api_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

# ─── A record: app.otopgestion.com → CloudFront ───────────────────────────────

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "${var.app_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.media.domain_name
    zone_id                = aws_cloudfront_distribution.media.hosted_zone_id
    evaluate_target_health = false
  }
}

# ─── Locals: computed domain URLs used across the stack ──────────────────────

locals {
  api_url = "https://${var.api_subdomain}.${var.domain_name}"
  app_url = "https://${var.app_subdomain}.${var.domain_name}"
}
