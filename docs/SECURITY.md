# Security Documentation

## Overview

SupportCarr implements industry-standard security practices to protect user data, prevent unauthorized access, and maintain system integrity.

## Authentication & Authorization

### User Authentication

- **Phone Number Verification**: Two-factor authentication via Twilio
- **Password Requirements**: Minimum 8 characters, hashed with bcrypt (12 rounds)
- **JWT Tokens**: HS256 signed tokens with expiration
- **Refresh Tokens**: Separate tokens for access renewal
- **Token Blacklisting**: Redis-based revocation list

### API Authentication

- **API Keys**: SHA-256 hashed keys for partner integrations
- **Rate Limiting**: Per-key hourly and daily limits
- **IP Whitelisting**: Optional IP restriction for API keys
- **Scope-based Permissions**: Granular access control

### Role-Based Access Control (RBAC)

- **Rider**: Request rescues, view own data
- **Driver**: Accept rescues, update status, view earnings
- **Admin**: Full system access, user management
- **Support**: Read-only access to support tickets

## Data Protection

### Encryption at Rest

**PII Encryption** (mongoose-encryption):
- Email addresses
- First and last names
- Driver license numbers
- Insurance information

**Encryption Key Management**:
- 32-character encryption key
- Stored in environment variables
- Rotated every 90 days
- Never committed to version control

### Encryption in Transit

- **TLS 1.3**: All API communication
- **Certificate Pinning**: Mobile apps (future)
- **HSTS**: Enforce HTTPS connections
- **Secure WebSocket**: WSS for real-time communication

### Password Security

```javascript
// Password hashing
bcrypt.hash(password, 12) // 12 salt rounds

// Password comparison
bcrypt.compare(inputPassword, hashedPassword)
```

## Input Validation & Sanitization

### Validation Layers

1. **Frontend Validation**: React Hook Form
2. **API Validation**: express-validator
3. **Database Validation**: Mongoose schemas
4. **Type Checking**: Runtime validation

### Sanitization

- **NoSQL Injection Prevention**: express-mongo-sanitize
- **XSS Protection**: DOMPurify on frontend, escaped output
- **SQL Injection**: N/A (NoSQL database)
- **CSRF Protection**: SameSite cookies, CSRF tokens

## Security Headers

Implemented via Helmet.js:

```javascript
{
  contentSecurityPolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}
```

## Rate Limiting

### API Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **SMS Sending**: 3 SMS per hour
- **File Uploads**: 50 uploads per hour

### Rate Limit Strategy

```javascript
// Redis-based rate limiting
const key = `ratelimit:${ip}:${endpoint}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, windowSeconds);
}
if (count > maxRequests) {
  throw new RateLimitError();
}
```

## OWASP Top 10 Protection

### 1. Injection

- ✅ Parameterized queries (Mongoose)
- ✅ Input validation
- ✅ NoSQL injection prevention

### 2. Broken Authentication

- ✅ Strong password requirements
- ✅ Multi-factor authentication
- ✅ Secure session management
- ✅ Account lockout after failed attempts

### 3. Sensitive Data Exposure

- ✅ TLS for all connections
- ✅ PII encryption at rest
- ✅ Secure headers
- ✅ No sensitive data in URLs

### 4. XML External Entities (XXE)

- ✅ N/A (JSON API only)

### 5. Broken Access Control

- ✅ Role-based permissions
- ✅ Resource ownership validation
- ✅ Default deny

### 6. Security Misconfiguration

- ✅ Secure defaults
- ✅ Minimal error messages
- ✅ Disabled directory listing
- ✅ Production-ready configuration

### 7. Cross-Site Scripting (XSS)

- ✅ Output escaping
- ✅ Content Security Policy
- ✅ Sanitized user input

### 8. Insecure Deserialization

- ✅ JSON.parse with validation
- ✅ No eval() usage
- ✅ Schema validation

### 9. Using Components with Known Vulnerabilities

- ✅ npm audit on CI/CD
- ✅ Automated dependency updates
- ✅ Trivy security scanning

### 10. Insufficient Logging & Monitoring

- ✅ Comprehensive logging
- ✅ Error tracking (Sentry)
- ✅ Security event alerts
- ✅ Access logs

## Data Privacy & Compliance

### GDPR Compliance

- **Right to Access**: API endpoint for data export
- **Right to Erasure**: Account deletion with data purge
- **Right to Rectification**: Update endpoints for all user data
- **Data Minimization**: Collect only necessary data
- **Consent Management**: Explicit opt-in for communications

### CCPA Compliance

- **Data Disclosure**: Privacy policy with data usage
- **Do Not Sell**: No data selling
- **Data Deletion**: On-demand account deletion
- **Opt-Out**: Communication preferences

### PCI DSS Compliance

- **Payment Processing**: Stripe handles all card data
- **No Card Storage**: Zero card data stored
- **Tokenization**: Payment method tokens only

## Secure Development Practices

### Code Security

- **Linting**: ESLint with security rules
- **Code Review**: All PRs reviewed
- **Static Analysis**: Automated security scanning
- **Dependency Scanning**: npm audit, Snyk

### Secret Management

- **Environment Variables**: All secrets in .env
- **AWS Secrets Manager**: Production secrets
- **No Hardcoded Secrets**: Pre-commit hooks
- **Secret Rotation**: Quarterly rotation

### Secure Deployment

- **Docker Security**:
  - Non-root user
  - Minimal base images
  - Security scanning

- **Kubernetes Security**:
  - Network policies
  - Pod security policies
  - RBAC
  - Secret encryption

## Incident Response

### Security Incident Process

1. **Detection**: Monitoring alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Root cause analysis
4. **Remediation**: Fix vulnerabilities
5. **Recovery**: Restore services
6. **Post-Mortem**: Document lessons learned

### Breach Notification

- **Timeline**: 72 hours for GDPR
- **Users Notified**: All affected users
- **Authorities Notified**: As required by law
- **Public Disclosure**: If material impact

## Security Audits

### Regular Audits

- **Automated Scans**: Daily
- **Penetration Testing**: Quarterly
- **Code Review**: Every PR
- **Dependency Audit**: Weekly
- **Infrastructure Audit**: Monthly

### Third-Party Audits

- **Annual**: SOC 2 Type II audit
- **Bi-annual**: Penetration testing by external firm

## Security Contacts

- **Security Email**: security@supportcarr.com
- **Bug Bounty**: HackerOne program
- **Response Time**: < 24 hours for critical issues

## Additional Security Measures

### Account Security

- **Account Lockout**: 5 failed attempts
- **Password Reset**: Phone verification required
- **Session Timeout**: 24 hours
- **Concurrent Sessions**: Unlimited (logout all feature)

### Driver Verification

- **Background Checks**: Third-party service
- **License Verification**: Manual review
- **Insurance Verification**: Manual review
- **Document Upload**: Secure S3 storage

### Payment Security

- **Stripe Integration**: PCI DSS Level 1
- **3D Secure**: Optional for high-value transactions
- **Fraud Detection**: Stripe Radar
- **Refund Controls**: Admin approval required

### API Security

- **CORS**: Whitelist allowed origins
- **API Versioning**: /api/v1 prefix
- **Request Validation**: All inputs validated
- **Response Filtering**: Sensitive data stripped

## Security Checklist

### Pre-Deployment

- [ ] All dependencies updated
- [ ] Security scan passed
- [ ] Secrets rotated
- [ ] TLS certificates valid
- [ ] Rate limits configured
- [ ] Logging enabled
- [ ] Error tracking configured
- [ ] Backups configured

### Post-Deployment

- [ ] Monitor error rates
- [ ] Review access logs
- [ ] Check alert thresholds
- [ ] Verify backups running
- [ ] Test incident response

## Future Security Enhancements

1. **Certificate Pinning**: Mobile apps
2. **Hardware Security Modules**: Key storage
3. **Biometric Authentication**: Fingerprint/Face ID
4. **Advanced Fraud Detection**: Machine learning
5. **Zero-Trust Architecture**: Service mesh
6. **Quantum-Resistant Encryption**: Future-proofing
