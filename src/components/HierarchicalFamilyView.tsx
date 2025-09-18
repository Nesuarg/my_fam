import type {
	PopulatedCouple,
	PopulatedFamilyTree,
} from "@/types/simple-family";
import type React from "react";
import FamilyCard from "./FamilyCard";
import MiniPersonCard from "./MiniPersonCard";

interface HierarchicalFamilyViewProps {
	familyTree: PopulatedFamilyTree;
	className?: string;
	enableNavigation?: boolean;
}

export function HierarchicalFamilyView({
	familyTree,
	className = "",
	enableNavigation = true,
}: HierarchicalFamilyViewProps) {
	const renderCoupleAndChildren = (
		couple: PopulatedCouple,
		level = 0,
		isRoot = false,
	): React.ReactNode => {
		return (
			<div key={couple.id} className="mb-8">
				{/* Render the couple */}
				<FamilyCard
					family={couple}
					level={level}
					enableNavigation={enableNavigation}
				/>

				{/* Render children */}
				{couple.children && couple.children.length > 0 && (
					<div className="mt-6">
						{/* Children section header */}
						<div className="text-center mb-4">
							<div className="text-sm text-gray-600 font-medium bg-white px-3 py-1 rounded-full border border-gray-300 inline-block">
								Children of {couple.person1.firstName}
								{couple.person2 ? ` & ${couple.person2.firstName}` : ""}
							</div>
						</div>

						<div className="space-y-4">
							{/* Children without own families - using MiniPersonCard for better space utilization */}
							{couple.children.filter((child) => !child.ownFamily).length >
								0 && (
								<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 justify-items-center px-2">
									{couple.children
										.filter((child) => !child.ownFamily)
										.map((child) => (
											<MiniPersonCard
												key={child.person.id}
												person={child.person}
												enableNavigation={enableNavigation}
											/>
										))}
								</div>
							)}

							{/* Children with their own families */}
							{couple.children
								.filter((child) => child.ownFamily)
								.map((child) => (
									<div key={child.person.id} className="mt-8">
										{child.ownFamily &&
											renderCoupleAndChildren(child.ownFamily, level + 1)}
									</div>
								))}
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className={`max-w-7xl mx-auto px-4 ${className}`}>
			{/* Family tree header */}
			<div className="text-center mb-8">
				<h2 className="text-3xl font-bold text-gray-800 mb-2">
					{familyTree.name}
				</h2>
				{familyTree.description && (
					<p className="text-gray-600">{familyTree.description}</p>
				)}
			</div>

			{/* Render the complete family tree starting from the founding couple */}
			{renderCoupleAndChildren(familyTree.foundingCouple, 0, true)}

			{/* Family stats */}
			<div className="mt-12 text-center">
				<div className="bg-gray-50 rounded-lg p-6 inline-block">
					<h3 className="text-lg font-semibold text-gray-800 mb-3">
						Family Statistics
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{familyTree.allPeople.length}
							</div>
							<div className="text-gray-600">Total People</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{familyTree.allPeople.filter((p) => p.gender === "male").length}
							</div>
							<div className="text-gray-600">Males</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-pink-600">
								{
									familyTree.allPeople.filter((p) => p.gender === "female")
										.length
								}
							</div>
							<div className="text-gray-600">Females</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{Math.round(
									familyTree.allPeople.reduce((sum, p) => sum + p.age, 0) /
										familyTree.allPeople.length,
								)}
							</div>
							<div className="text-gray-600">Avg Age</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default HierarchicalFamilyView;
