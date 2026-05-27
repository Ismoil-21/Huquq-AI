# SMTP Configuration for Email Verification

Email verification is **mandatory** for user registration. You must configure SMTP settings for the application to send OTP emails.

## Required Environment Variables

Add the following environment variables to your `.env` file or deployment platform (Render):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=toxirovi82@gmail.com
SMTP_PASS=fcqegjftlbloenuq
```

## Gmail Setup Instructions

1. Enable 2-Factor Authentication on your Google Account
2. Go to Google Account > Security > App Passwords
3. Generate a new App Password with name "Mening Huquqim"
4. Use the generated 16-character password as `SMTP_PASS`

## Alternative SMTP Providers

You can use any SMTP provider. Update the settings accordingly:

- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **AWS SES**: `email-smtp.us-east-1.amazonaws.com:587`

## Testing

After configuration, test by registering a new user. You should receive an OTP email within a few seconds.

## Troubleshooting

- If emails don't arrive, check spam folder
- Verify SMTP credentials are correct
- Ensure port 587 is not blocked by firewall
- Check backend logs for email sending errors
