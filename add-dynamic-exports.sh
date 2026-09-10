#!/bin/bash
# Add export const dynamic = 'force-dynamic' to all API route files

find src/app/api -name "route.ts" -o -name "route.tsx" | while read file; do
  # Check if file already has the dynamic export
  if ! grep -q "export const dynamic = 'force-dynamic'" "$file"; then
    # Add it after imports, before other code
    sed -i "1a export const dynamic = 'force-dynamic';" "$file"
    echo "Added dynamic export to $file"
  fi
done

echo "Done!"
