import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './email-layout';

interface NewReviewEmailProps {
  authorName: string;
  reviewerName: string;
  storyTitle: string;
  rating: number; // 1–5
  reviewText?: string;
  storyUrl: string;
}

export function NewReviewEmail({
  authorName,
  reviewerName,
  storyTitle,
  rating,
  reviewText,
  storyUrl,
}: NewReviewEmailProps) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <EmailLayout preview={`${reviewerName} rated ${storyTitle} ${rating}/5`}>
      <Text style={label}>New Review</Text>
      <Heading style={heading}>{storyTitle}</Heading>
      <Text style={text}>
        Hey {authorName}, <strong style={strong}>{reviewerName}</strong> just left a review on
        your story.
      </Text>
      <Text style={starsStyle}>{stars}</Text>
      {reviewText && <Text style={quote}>&ldquo;{reviewText}&rdquo;</Text>}
      <Button href={storyUrl} style={button}>
        View Story
      </Button>
    </EmailLayout>
  );
}

export default NewReviewEmail;

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
  margin: '0 0 12px',
};

const strong = {
  color: '#ffffff',
};

const starsStyle = {
  color: '#f5a623',
  fontSize: '24px',
  margin: '8px 0 16px',
  letterSpacing: '2px',
};

const quote = {
  color: '#aaaaaa',
  fontSize: '15px',
  fontStyle: 'italic',
  borderLeft: '3px solid #333333',
  paddingLeft: '16px',
  margin: '0 0 24px',
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
