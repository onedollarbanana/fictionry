import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

const BASE_URL = 'https://www.fictionry.com';

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Link href={BASE_URL} style={logoLink}>
              <Text style={logoText}>Fictionry</Text>
            </Link>
            <Text style={tagline}>The Modern Way to Read and Write Fiction</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you have an account on{' '}
              <Link href={BASE_URL} style={footerLink}>Fictionry</Link>.
            </Text>
            <Text style={footerText}>
              <Link href={`${BASE_URL}/settings/notifications`} style={footerLink}>
                Manage email preferences
              </Link>{' '}
              &middot;{' '}
              <Link href={`${BASE_URL}/settings/notifications`} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Fictionry. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#0f0f0f',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '0',
  padding: '0',
};

const container = {
  backgroundColor: '#1a1a1a',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const header = {
  backgroundColor: '#111111',
  padding: '24px 32px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #2a2a2a',
};

const logoLink = {
  textDecoration: 'none',
};

const logoText = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const tagline = {
  color: '#888888',
  fontSize: '13px',
  margin: '4px 0 0',
};

const content = {
  padding: '32px',
};

const divider = {
  borderColor: '#2a2a2a',
  margin: '0',
};

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#555555',
  fontSize: '12px',
  margin: '4px 0',
  lineHeight: '1.5',
};

const footerLink = {
  color: '#888888',
  textDecoration: 'underline',
};
