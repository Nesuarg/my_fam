import type { APIRoute } from 'astro';
import { savePerson, generatePersonId } from '../../lib/cms';
import type { Person } from '../../types/family';

// Mark this endpoint as server-rendered
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.json();
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      return new Response('Fornavn og efternavn er påkrævet', { status: 400 });
    }

    // Generate unique ID
    const id = generatePersonId(formData.firstName, formData.lastName);

    // Build person object
    const person: Person = {
      id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleName: formData.middleName || undefined,
      maidenName: formData.maidenName || undefined,
      gender: formData.gender || 'unknown',
      isLiving: formData.isLiving !== undefined ? formData.isLiving : true,
      notes: formData.notes || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add birth information if provided
    if (formData.birthYear) {
      person.birthDate = {
        year: parseInt(formData.birthYear),
        month: formData.birthMonth ? parseInt(formData.birthMonth) : undefined,
        day: formData.birthDay ? parseInt(formData.birthDay) : undefined
      };
    }

    // Add birth place if provided
    if (formData.birthCity || formData.birthState || formData.birthCountry) {
      person.birthPlace = {
        city: formData.birthCity || undefined,
        state: formData.birthState || undefined,
        country: formData.birthCountry || undefined
      };
    }

    // Add occupation if provided
    if (formData.occupation) {
      person.occupation = [formData.occupation];
    }

    // Save person to file
    savePerson(person);

    return new Response('Familiemedlem tilføjet succesfuldt', { status: 200 });
    
  } catch (error) {
    console.error('Error adding person:', error);
    return new Response('Der opstod en fejl under tilføjelsen af familiemedlemmet', { status: 500 });
  }
};