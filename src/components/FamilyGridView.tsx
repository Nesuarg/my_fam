import type {
	PopulatedCouple,
	PopulatedFamilyTree,
} from "@/types/simple-family";
import { CompactPersonCard } from "./CompactPersonCard";
import { FamilyCard } from "./FamilyCard";

interface FamilyGridViewProps {
	familyTree: PopulatedFamilyTree;
	enableNavigation?: boolean;
}

export function FamilyGridView({
	familyTree,
	enableNavigation = true,
}: FamilyGridViewProps) {
	const foundingCouple = familyTree.foundingCouple;

	// Get all children couples and single children
	const childrenWithFamilies: PopulatedCouple[] = [];
	const singleChildren = [];

	if (foundingCouple.children) {
		for (const child of foundingCouple.children) {
			if (child.ownFamily) {
				childrenWithFamilies.push(child.ownFamily);
			} else {
				singleChildren.push(child.person);
			}
		}
	}

	return (
		<div className="w-full max-w-7xl mx-auto">
			{/* Founding Couple at the Top */}
			<div className="mb-12 flex justify-center">
				<div className="max-w-md">
					<FamilyCard
						family={foundingCouple}
						level={0}
						enableNavigation={enableNavigation}
					/>
				</div>
			</div>

			{/* Children Couples Grid */}
			{childrenWithFamilies.length > 0 && (
				<div className="mb-8">
					<h3 className="text-xl font-semibold text-center text-gray-800 mb-6">
						Børnenes familier
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-6 auto-rows-fr">
						{childrenWithFamilies.map((couple) => (
							<div key={couple.id} className="flex">
								<FamilyCard
									family={couple}
									level={1}
									className="w-full"
									enableNavigation={enableNavigation}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Single Children (if any) */}
			{singleChildren.length > 0 && (
				<div className="mb-8">
					<h3 className="text-xl font-semibold text-center text-gray-800 mb-6">
						Ugift/alene
					</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-6">
						{singleChildren.map((person) => (
							<div key={person.id} className="flex justify-center">
								<CompactPersonCard
									person={person}
									enableNavigation={enableNavigation}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Summary Information */}
			<div className="text-center text-gray-600 mt-12 p-4 bg-gray-50 rounded-lg">
				<p className="text-sm">
					<strong>{foundingCouple.person1.firstName}</strong>
					{foundingCouple.person2 && (
						<>
							{" "}
							& <strong>{foundingCouple.person2.firstName}</strong>
						</>
					)}
				</p>
				<p className="text-xs mt-1">
					{foundingCouple.children?.length || 0} børn •
					{childrenWithFamilies.length} familier •{singleChildren.length} single
				</p>
			</div>
		</div>
	);
}

export default FamilyGridView;
