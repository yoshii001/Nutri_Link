# Parent Portal

This folder contains all parent-facing screens and functionality.

## Overview

The Parent Portal allows parents to access their child's meal information using a unique 4-character access code provided by their child's teacher.

## Access Code System

When a teacher adds a student to the system, a unique access code is automatically generated with the format:
- **2 numbers** (00-99)
- **2 letters** (AA-ZZ)
- Example: `45XY`, `12AB`, `78CD`

This code is:
- Automatically generated and saved in the student profile
- Guaranteed to be unique across all students
- Shared by the teacher through the "Share" button on the student list

## Features Available to Parents

### 1. View Student Information
- Student name, ID, grade, and age
- Current access code

### 2. Today's Meal Information
- Whether the meal was served today
- Time of meal service
- Any notes from the teacher
- Meal name and details

### 3. Donor Information
- Name of the donor who provided today's meal
- Type of food/item donated
- Quantity and description
- Current average rating and total ratings

### 4. Submit Allergies
Parents can update and maintain their child's allergy information, which teachers can view when serving meals.

### 5. Provide Meal Feedback
Parents can share feedback about the meals their child is receiving.

### 6. Rate Donors
Parents can rate donors (1-5 stars) and leave optional comments. These ratings are:
- Visible to the donor in their dashboard
- Averaged to show donor reputation
- Help maintain quality of donations

## Files

- `index.tsx` - Redirects to parent login
- `portal.tsx` - Main parent portal dashboard
- `README.md` - This documentation

## Related Files

- `/app/parent-login.tsx` - Parent login screen (access code entry)
- `/services/firebase/parentService.ts` - All parent-related database operations
- `/utils/accessCode.ts` - Access code generation and validation

## How It Works

1. Teacher adds a student → System generates unique access code
2. Teacher shares access code with parent (via Share button)
3. Parent enters code in parent-login screen
4. System validates code and loads student data
5. Parent accesses portal with full student information

## Security

- Access codes are unique per student
- No password required (access code serves as authentication)
- Session stored in AsyncStorage for convenience
- Parents can only view their own child's information
