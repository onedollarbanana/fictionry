import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './email-layout';

interface CommentReplyEmailProps {
  recipientName: string;
  replierName: string;
  storyTitle: string;
  originalComment: string;
  replyText: string;
  commentUrl: string;
}

export function CommentReplyEmail({
  recipientName,
  replierName,
  storyTitle,
  originalComment,
  replyText,
  commentUrl,
}: CommentReplyEmailProps) {
  return (
    <EmailLayout preview={`${replierName} replied to your comment on ${storyTitle}`}>
      <Text style={label}>Comment Reply</Text>
      <Heading style={heading}>{storyTitle}</Heading>
      <Text style={text}>
        Hey {recipientName}, <strong style={strong}>{replierName}</strong> replied to your
        comment.
      </Text>
      <Text style={sectionLabel}>Your comment</Text>
      <Text style={originalQuote}>&ldquo;{originalComment}&rdquo;</Text>
      <Text style={sectionLabel}>{replierName}&apos;s reply</Text>
      <Text style={replyQuote}>&ldquo;{replyText}&rdquo;</Text>
      <Button href={commentUrl} style={button}>
        View Reply
      </Button>
    </EmailLayout>
  );
}

export default CommentReplyEmail;

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
  margin: '0 0 16px',
};

const text = {
  color: '#cccccc',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const strong = {
  color: '#ffffff',
};

const sectionLabel = {
  color: '#666666',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.8px',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
};

const originalQuote = {
  color: '#888888',
  fontSize: '14px',
  fontStyle: 'italic',
  borderLeft: '3px solid #333333',
  paddingLeft: '14px',
  margin: '0 0 20px',
  lineHeight: '1.6',
};

const replyQuote = {
  color: '#cccccc',
  fontSize: '15px',
  fontStyle: 'italic',
  borderLeft: '3px solid #555555',
  paddingLeft: '14px',
  margin: '0 0 28px',
  lineHeight: '1.6',
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
