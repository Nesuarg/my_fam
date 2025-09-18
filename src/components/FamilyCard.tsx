import type { PopulatedCouple, SimplePerson } from "@/types/simple-family";
import { getLevelBackgroundClass } from "@/types/simple-family-utils";
import type React from "react";
import { CompactPersonCard } from "./CompactPersonCard";

interface FamilyCardProps {
	// Can be either a couple or a single person
	family?: PopulatedCouple;
	singlePerson?: SimplePerson;
	level?: number;
	className?: string;
	enableNavigation?: boolean;
}

export function FamilyCard({
	family,
	singlePerson,
	level = 0,
	className = "",
	enableNavigation = true,
}: FamilyCardProps) {
	const levelBgClass = getLevelBackgroundClass(level);

	// Determine if this is a couple or single person
	const isCouple = family?.person2;
	const isSingle = singlePerson || (family && !family.person2);

	// Get the primary person for navigation
	const primaryPerson = family?.person1 || singlePerson;

	// Get navigation ID - for couples use couple ID, for singles use person ID
	const navigationId = family ? family.id : singlePerson?.id;
	const navigationType = family ? "couple" : "person";

	const handleFamilyClick = () => {
		if (enableNavigation && navigationId) {
			window.location.href = `/${navigationType}/${navigationId}${navigationType === "person" ? "/children" : ""}`;
		}
	};

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (enableNavigation && (event.key === "Enter" || event.key === " ")) {
			event.preventDefault();
			if (navigationId) {
				window.location.href = `/${navigationType}/${navigationId}${navigationType === "person" ? "/children" : ""}`;
			}
		}
	};

	// Get display name for accessibility
	const getDisplayName = () => {
		if (isCouple && family) {
			return `${family.person1.firstName}${family.person2 ? ` og ${family.person2.firstName}` : ""}s familie`;
		}
		if (primaryPerson) {
			return `${primaryPerson.firstName}s side`;
		}
		return "Familie";
	};

	return (
		<div className={`w-full h-full ${className}`}>
			<div
				className={`p-2 sm:p-3 rounded-lg ${levelBgClass} border border-gray-200 relative w-full h-full flex flex-col justify-between`}
			>
				{/* Person Cards Layout */}
				<div className="flex items-center justify-center gap-4 sm:gap-6">
					{/* Always show the primary person */}
					{primaryPerson && (
						<CompactPersonCard
							person={primaryPerson}
							enableNavigation={false}
						/>
					)}

					{/* Show second person only if it's a couple */}
					{isCouple && family?.person2 && (
						<CompactPersonCard
							person={family.person2}
							enableNavigation={false}
						/>
					)}
				</div>

				{/* Couple Connection Indicator - only for couples */}
				{isCouple && family?.person2 && (
					<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
						<div className="w-10 h-10 bg-red-100/75 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
							<span className="text-white text-sm">💕</span>
						</div>
					</div>
				)}

				{/* Family Information */}
				<div className="text-center mt-2 flex flex-col justify-between">
					{/* Relationship Type - only for couples */}
					{isCouple && family?.relationshipType && (
						<div className="text-xs text-red-600 font-medium capitalize">
							{family.relationshipType}
						</div>
					)}

					{/* Single Person Status */}
					{isSingle && (
						<div className="text-xs text-purple-600 font-medium">Ugift</div>
					)}

					{/* Children Count */}
					{family?.children && family.children.length > 0 && (
						<div className="text-xs text-gray-600 font-medium">
							{family.children.length}{" "}
							{family.children.length === 1 ? "barn" : "børn"}
						</div>
					)}

					{/* "Se familie" button - only show if navigation is enabled */}
					{enableNavigation && (
						<div className="mt-3 pt-2 border-t border-gray-200/50">
							<button
								onClick={handleFamilyClick}
								type="button"
								className="w-full bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
							>
								{isSingle ? "Se person" : "Se familie"}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default FamilyCard;
