---
name: Add New Family Member
about: Template for adding a new person to the family tree
title: '[ADD PERSON] Add [Full Name] to Family Tree'
labels: ['family-member', 'data-entry']
assignees: []
---

## New Family Member Information

### Personal Details
- **Full Name**: [First Name] [Last Name]
- **Birth Date**: [MM/DD/YYYY or leave blank if unknown]
- **Birth Place**: [City, Country or leave blank if unknown]
- **Gender**: [male/female/non-binary/other/unknown]
- **Is Living**: [Yes/No]
- **Death Date**: [MM/DD/YYYY or leave blank if still living/unknown]
- **Maiden Name** (if applicable): [Maiden name for married females]

### Family Relationships
- **Spouse(s)**: [Full name of spouse(s), separate multiple with commas]
- **Father**: [Full name of father or leave blank if unknown]
- **Mother**: [Full name of mother or leave blank if unknown]  
- **Children**: [List of children's full names, separate with commas]

### Additional Information (Optional)
- **Occupation**: [Job/profession]
- **Education**: [Educational background]
- **Nicknames**: [Any nicknames, separate with commas]
- **Notes**: [Any additional family history or notes]

### CSV Format (for AI Agent)
Please provide the information in the following CSV format for easy processing:

```csv
Timestamp,Hvem er I?,Hvornår er du født,Hvem er dine forældre?
[Current timestamp],[Name or "Name1 og Name2" for couples],[MM/DD/YYYY],[Parent1 og Parent2 or "-" if unknown]
```

### Example
```csv
1/15/2025 10:30:00,Anna og Peter,5/12/1985,Marie og Lars
```

---

**For AI Agents**: Use the CSV data above to add this person to the family tree using the `parseCsvToPersons` utility function. Update the family data file accordingly and ensure all relationships are properly linked.

**Verification Checklist**:
- [ ] Person added to CSV data
- [ ] Spouse relationships properly linked (bidirectional)
- [ ] Parent-child relationships established
- [ ] No duplicate entries created
- [ ] Family tree displays correctly on the website