#!/bin/bash
prisma generate 2>/dev/null || true
tsc 2>/dev/null || true
exit 0