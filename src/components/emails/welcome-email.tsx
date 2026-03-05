import { Button, Heading, Text, Link } from '@react-email/components';
import { EmailLayout } from './email-layout';

interface WelcomeEmailProps {
  displayName: string;
}

const BASE_URL = 'https://www.fictionry.com';

export function WelcomeEmail({ displayName }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to Fictionry, ${displayName}!`}>
      <Heading style={heading}>Welcome to Fictionry!</Heading>
      <Text style={text}>
        Hey {displayName}, you&apos;re officially part of the community. Fictionry is a
        human-first reading and writing platform — built to reward quality stories and protect
        authors&apos; rights.
      </Text>
      <Text style={text}>Here&apos;s what you can do right now:</Text>
      <Text style={listItem}>📖 Discover stories in your favourite genres</Text>
      <Text style={listItem}>🌟 Follow stories to get notified on new chapters</Text>
      <Text style={listItem}>✍️ Publish your own fiction (free, always)</Text>
      <Button href={`${BASE_URL}/browse`} style={button}>
        Start Exploring
      </Button>
      <Text style={text}>
        Questions? Reply to this email or reach out at{' '}
        <Link href="mailto:hello@fictionry.com" style={link}>
          hello@fictionry.com
        </Link>
        .
      </Text>
      <Text style={signoff}>Happy reading,{'\n'}The Fictionry Team</Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 16px',
};

const text = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const listItem = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '4px',
};

const button = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  color: '#000000',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 28px',
  textDecoration: 'none',
  margin: '16px 0 24px',
};

const link = {
  color: '#aaaaaa',
  textDecoration: 'underline',
};

const signoff = {
  color: '#888888',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '24px 0 0',
  whiteSpace: 'pre-line' as const,
};
