import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './email-layout';

interface AuthorAnnouncementEmailProps {
  readerName: string;
  authorName: string;
  announcementTitle: string;
  announcementMessage: string;
  authorProfileUrl: string;
}

export function AuthorAnnouncementEmail({
  readerName,
  authorName,
  announcementTitle,
  announcementMessage,
  authorProfileUrl,
}: AuthorAnnouncementEmailProps) {
  return (
    <EmailLayout preview={`${authorName}: ${announcementTitle}`}>
      <Text style={label}>Author Announcement</Text>
      <Heading style={heading}>{announcementTitle}</Heading>
      <Text style={from}>from {authorName}</Text>
      <Text style={text}>Hey {readerName},</Text>
      <Text style={message}>{announcementMessage}</Text>
      <Button href={authorProfileUrl} style={button}>
        View Author Profile
      </Button>
    </EmailLayout>
  );
}

export default AuthorAnnouncementEmail;

const label = {
  color: '#888888',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const heading = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 4px',
};

const from = {
  color: '#888888',
  fontSize: '13px',
  margin: '0 0 24px',
};

const text = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const message = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 28px',
  whiteSpace: 'pre-line' as const,
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
};
