import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Person, FamilyDate } from "@/types/family";
import { calculateAge, formatDate } from "@/types/family-utils";

interface PersonCardProps {
	person: Person;
	className?: string;
}

export function PersonCard({ person, className = "" }: PersonCardProps) {
	const age = person.birthDate
		? calculateAge(person.birthDate, person.deathDate)
		: null;
	const birthPlace = person.birthPlace
		? `${person.birthPlace.city || ""}${person.birthPlace.city && person.birthPlace.country ? ", " : ""}${person.birthPlace.country || ""}`
		: "Unknown";

	const getGenderColor = (gender?: string) => {
		switch (gender) {
			case "male":
				return "bg-blue-100 border-blue-300";
			case "female":
				return "bg-pink-100 border-pink-300";
			default:
				return "bg-gray-100 border-gray-300";
		}
	};

	const getStatusBadge = () => {
		if (person.isLiving === false || person.deathDate) {
			return (
				<Badge variant="outline" className="text-gray-600">
					Deceased
				</Badge>
			);
		}
		return (
			<Badge
				variant="default"
				className="bg-green-100 text-green-800 border-green-300"
			>
				Living
			</Badge>
		);
	};

	return (
		<Card
			className={`w-64 min-h-80 ${getGenderColor(person.gender)} border-2 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden ${className}`}
		>
			<CardHeader className="pb-1 px-4 pt-4">
				{/* Person Photo Placeholder */}
				<div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-4 border-white shadow-md">
					<span className="text-xl font-bold text-slate-600">
						{person.firstName.charAt(0)}
						{person.lastName.charAt(0)}
					</span>
				</div>

				{/* Name */}
				<div className="text-center">
					<h3 className="font-bold text-base leading-tight mb-1">
						{person.firstName} {person.lastName}
					</h3>
					{person.maidenName && person.maidenName !== person.lastName && (
						<p className="text-xs text-gray-600 italic">
							(née {person.maidenName})
						</p>
					)}
				</div>
			</CardHeader>

			<CardContent className="px-4 pb-4 pt-2 flex-1">
				{/* Stats Section */}
				<div className="space-y-2">
					{/* Age */}
					<div className="flex justify-between items-center py-1.5 px-2 bg-white/70 rounded-md">
						<span className="text-xs font-medium text-gray-700">Age</span>
						<span className="text-xs font-bold">
							{age !== null ? `${age}y` : "Unknown"}
						</span>
					</div>

					{/* Birth Date */}
					{person.birthDate && (
						<div className="flex justify-between items-center py-1.5 px-2 bg-white/70 rounded-md">
							<span className="text-xs font-medium text-gray-700">Born</span>
							<span className="text-xs font-bold">
								{formatDate(person.birthDate)}
							</span>
						</div>
					)}

					{/* Birth Place */}
					<div className="flex justify-between items-center py-1.5 px-2 bg-white/70 rounded-md">
						<span className="text-xs font-medium text-gray-700">
							Birthplace
						</span>
						<span
							className="text-xs font-bold text-right max-w-28 truncate"
							title={birthPlace}
						>
							{birthPlace}
						</span>
					</div>

					{/* Status Badge */}
					<div className="flex justify-center pt-2">{getStatusBadge()}</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default PersonCard;
