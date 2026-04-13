#!/bin/bash

RESOURCE_ID=$1
LOCK_DIR="${RESOURCE_ID}.lock"

# Check if the lock directory exists
if [ -d "$LOCK_DIR" ]; then
    # Remove the directory to free up the resource
    rmdir "$LOCK_DIR"
    echo "RELEASED"
else
    echo "NO_LOCK_FOUND"
fi