#!/bin/bash

# Arguments passed from Node.js
RESOURCE_ID=$1
TIMEOUT=$2

# The lock is just a directory with the user's ID
LOCK_DIR="${RESOURCE_ID}.lock"

# Calculate when to give up
END_TIME=$((SECONDS + TIMEOUT))

# Loop until we get the lock or time out
while [ $SECONDS -lt $END_TIME ]; do
    # Try to create the directory (2>/dev/null hides the error if it already exists)
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        echo "SUCCESS"
        exit 0
    fi
    # If it failed, wait a tiny bit and try again (OS polling)
    sleep 0.1
done

# If the loop finishes and we still don't have it
echo "FAILED"
exit 1
