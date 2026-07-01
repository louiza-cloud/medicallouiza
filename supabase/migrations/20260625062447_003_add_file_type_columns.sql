-- Add attachment_type column to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Add file_type column to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update existing messages to infer attachment_type from attachment_url
UPDATE messages SET attachment_type = 'image' WHERE attachment_url IS NOT NULL AND (attachment_url LIKE '%.jpg' OR attachment_url LIKE '%.jpeg' OR attachment_url LIKE '%.png' OR attachment_url LIKE '%.gif' OR attachment_url LIKE '%.webp');
UPDATE messages SET attachment_type = 'pdf' WHERE attachment_url IS NOT NULL AND (attachment_url LIKE '%.pdf');
UPDATE messages SET attachment_type = 'word' WHERE attachment_url IS NOT NULL AND (attachment_url LIKE '%.doc' OR attachment_url LIKE '%.docx');
UPDATE messages SET attachment_type = 'other' WHERE attachment_url IS NOT NULL AND attachment_type IS NULL;

-- Update existing documents to infer file_type from file_url
UPDATE documents SET file_type = 'image' WHERE file_url LIKE '%.jpg' OR file_url LIKE '%.jpeg' OR file_url LIKE '%.png' OR file_url LIKE '%.gif' OR file_url LIKE '%.webp';
UPDATE documents SET file_type = 'pdf' WHERE file_url LIKE '%.pdf';
UPDATE documents SET file_type = 'word' WHERE file_url LIKE '%.doc' OR file_url LIKE '%.docx';
UPDATE documents SET file_type = 'other' WHERE file_type IS NULL;
