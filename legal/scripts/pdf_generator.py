# legal/scripts/pdf_generator.py
"""Upload bytes to Supabase storage and return a public URL."""
# Ensure bucket exists. Creating buckets requires service role key (server-side only).
buckets = supabase.storage.list_buckets().execute()
existing = [b['name'] for b in buckets.data or []]
if BUCKET_NAME not in existing:
supabase.storage.create_bucket(BUCKET_NAME, public=True).execute()


# Upload file
res = supabase.storage.from_(BUCKET_NAME).upload(filename, pdf_bytes)
if res.status_code not in (200, 201):
raise RuntimeError(f"Failed to upload PDF: {res}")


# Get public URL
public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename).get('publicURL')
if not public_url:
# Fallback: construct URL manually (depends on your Supabase project)
public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{filename}"


return public_url




def generate_fir_pdf_and_upload(fir_data: dict) -> str:
"""Main entrypoint: generate FIR PDF from data dict and upload to Supabase.
Returns the public URL for the uploaded PDF."""
# Create a filename (safe)
safe_number = fir_data.get('fir_number') or fir_data.get('id') or 'unknown'
filename = f"fir_{safe_number}.pdf"


pdf_bytes = _create_pdf_bytes(fir_data)


url = upload_pdf_to_supabase(pdf_bytes, filename)
return url




# If module run directly for quick test (not recommended in production)
if __name__ == '__main__':
sample = {
'fir_number': 'TEST-001',
'incident_date': '2025-10-19',
'incident_location': 'Test City',
'incident_type': 'Theft',
'incident_description': 'Sample description',
'accused_description': 'Unknown',
'reported_by': 'Alice'
}
print('Generating and uploading sample PDF...')
print(generate_fir_pdf_and_upload(sample))
