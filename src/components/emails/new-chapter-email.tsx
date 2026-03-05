import { Button, Heading, Text } from '@react-email/components';
import { EmailLayout } from './email-layout';

interface NewChapterEmailProps {
  readerName: string;
  storyTitle: string;
  chapterTitle: string;
  authorName: string;
  chapterUrl: string;
}

export function NewChapterEmail({
  readerName,
  storyTitle,
  chapterTitle,
  authorName,
  chapterUrl,
}: NewChapterEmailProps) {
  return (
    <EmailLayout preview={`New chapter: ${chapterTitle} — ${storyTitle}`}>
      <Text style={label}>New Chapter</Text>
      <Heading style={heading}>{storyTitle}</Heading>
      <Text style={text}>
        Hey {readerName}, <strong style={strong}>{authorName}</strong> just published a new
        chapter.
      </Text>
      <Text style={chapterName}>&ldquo;{chapterTitle}&rdquo;</Text>
      <Button href={chapterUrl} style={button}>
        Read Now
      </Button>
    </EmailLayout>
  );
}

export default NewChapterEmail;

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
  margin: '0 0 16px',
};

const strong = {
  color: '#ffffff',
};

const chapterName = {
  color: '#aaaaaa',
  fontSize: '18px',
  fontStyle: 'italic',
  margin: '0 0 24px',
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
