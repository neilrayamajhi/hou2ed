-- Add intake field to listings table for document requirements
-- This field stores configuration for what documents are required for applications

-- Add the intake column as JSONB to store flexible document requirements
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS intake JSONB;

-- Add a comment to document the field structure
COMMENT ON COLUMN listings.intake IS
'Intake configuration for the listing including document requirements. Structure:
{
  "documents_required": [
    {
      "id": "string - unique identifier",
      "label": "string - display name",
      "description": "string - optional instructions",
      "required": boolean,
      "category": "identification|financial|medical|reference|legal|custom|other"
    }
  ]
}';

-- Set default intake for existing listings (optional - only basic documents)
UPDATE listings
SET intake = jsonb_build_object(
  'documents_required', jsonb_build_array(
    jsonb_build_object(
      'id', 'id',
      'label', 'Government ID',
      'required', true,
      'category', 'identification'
    ),
    jsonb_build_object(
      'id', 'income',
      'label', 'Proof of Income',
      'required', false,
      'category', 'financial'
    )
  )
)
WHERE intake IS NULL;