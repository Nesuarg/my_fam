import React, { useState } from 'react';
import type { Person, Gender } from '../types/family';

interface FormData {
  firstName: string;
  lastName: string;
  middleName: string;
  maidenName: string;
  gender: Gender;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthCity: string;
  birthState: string;
  birthCountry: string;
  occupation: string;
  isLiving: boolean;
  notes: string;
}

export default function AddPersonForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    maidenName: '',
    gender: 'unknown',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthCity: '',
    birthState: '',
    birthCountry: '',
    occupation: '',
    isLiving: true,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/add-person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('Familiemedlem tilføjet succesfuldt!');
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          middleName: '',
          maidenName: '',
          gender: 'unknown',
          birthYear: '',
          birthMonth: '',
          birthDay: '',
          birthCity: '',
          birthState: '',
          birthCountry: '',
          occupation: '',
          isLiving: true,
          notes: ''
        });
      } else {
        const error = await response.text();
        setMessage(`Fejl: ${error}`);
      }
    } catch (error) {
      setMessage(`Fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            Fornavn *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Efternavn *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
            Mellemnavn
          </label>
          <input
            type="text"
            id="middleName"
            name="middleName"
            value={formData.middleName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="maidenName" className="block text-sm font-medium text-gray-700 mb-1">
            Pigenavn
          </label>
          <input
            type="text"
            id="maidenName"
            name="maidenName"
            value={formData.maidenName}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Køn
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="unknown">Ukendt</option>
            <option value="male">Mand</option>
            <option value="female">Kvinde</option>
            <option value="non-binary">Non-binær</option>
            <option value="other">Andet</option>
          </select>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="isLiving"
              checked={formData.isLiving}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Er i live</span>
          </label>
        </div>
      </div>

      {/* Birth Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fødselsoplysninger</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="birthYear" className="block text-sm font-medium text-gray-700 mb-1">
              År
            </label>
            <input
              type="number"
              id="birthYear"
              name="birthYear"
              value={formData.birthYear}
              onChange={handleChange}
              min="1800"
              max="2030"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="birthMonth" className="block text-sm font-medium text-gray-700 mb-1">
              Måned
            </label>
            <input
              type="number"
              id="birthMonth"
              name="birthMonth"
              value={formData.birthMonth}
              onChange={handleChange}
              min="1"
              max="12"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="birthDay" className="block text-sm font-medium text-gray-700 mb-1">
              Dag
            </label>
            <input
              type="number"
              id="birthDay"
              name="birthDay"
              value={formData.birthDay}
              onChange={handleChange}
              min="1"
              max="31"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="birthCity" className="block text-sm font-medium text-gray-700 mb-1">
              By
            </label>
            <input
              type="text"
              id="birthCity"
              name="birthCity"
              value={formData.birthCity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="birthState" className="block text-sm font-medium text-gray-700 mb-1">
              Stat/Region
            </label>
            <input
              type="text"
              id="birthState"
              name="birthState"
              value={formData.birthState}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label htmlFor="birthCountry" className="block text-sm font-medium text-gray-700 mb-1">
            Land
          </label>
          <input
            type="text"
            id="birthCountry"
            name="birthCountry"
            value={formData.birthCountry}
            onChange={handleChange}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Additional Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Øvrige oplysninger</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
              Erhverv
            </label>
            <input
              type="text"
              id="occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="F.eks. Lærer, Ingeniør"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Noter
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Gemmer...' : 'Tilføj familiemedlem'}
        </button>

        {message && (
          <div className={`mt-4 p-3 rounded ${
            message.includes('Fejl') 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {message}
          </div>
        )}
      </div>
    </form>
  );
}