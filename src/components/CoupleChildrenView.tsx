import type { PopulatedCouple } from "@/types/simple-family";
import FamilyCard from "./FamilyCard";

interface CoupleChildrenViewProps {
	couple: PopulatedCouple;
}

export function CoupleChildrenView({ couple }: CoupleChildrenViewProps) {
	return (
		<div className="py-8">
			{/* Couple Information at Top */}
			<div className="mb-12 flex justify-center">
				<div className="max-w-md">
					<FamilyCard family={couple} level={0} enableNavigation={false} />
				</div>
			</div>

			{/* Children Section */}
			{couple.children && couple.children.length > 0 ? (
				<div className="mb-8">
					<h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
						Børn ({couple.children.length})
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{couple.children
							.sort((a, b) => (a.birthOrder || 0) - (b.birthOrder || 0))
							.map((child) => (
								<div
									key={child.person.id}
									className="flex flex-col items-center"
								>
									{/* Child's Own Family (if they have one) */}
									{child.ownFamily ? (
										<FamilyCard
											family={child.ownFamily}
											level={1}
											enableNavigation={true}
										/>
									) : (
										<FamilyCard
											singlePerson={child.person}
											level={1}
											enableNavigation={true}
										/>
									)}
								</div>
							))}
					</div>
				</div>
			) : (
				<div className="text-center py-12">
					<h2 className="text-2xl font-semibold text-gray-800 mb-4">
						Ingen børn registreret
					</h2>
					<p className="text-gray-600">
						{couple.person1.firstName}
						{couple.person2 && ` og ${couple.person2.firstName}`} har ingen børn
						registreret i systemet.
					</p>
				</div>
			)}

			{/* Family Statistics */}
			<div className="mt-12 text-center bg-gray-50 rounded-lg p-6">
				<h3 className="text-lg font-semibold text-gray-800 mb-4">
					Familie statistik
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
					<div className="bg-white rounded-lg p-3 shadow-sm">
						<div className="text-2xl font-bold text-blue-600">
							{couple.children?.length || 0}
						</div>
						<div className="text-sm text-gray-600">Børn</div>
					</div>
					<div className="bg-white rounded-lg p-3 shadow-sm">
						<div className="text-2xl font-bold text-green-600">
							{couple.children?.filter((c) => c.ownFamily).length || 0}
						</div>
						<div className="text-sm text-gray-600">Gift/Partner</div>
					</div>
					<div className="bg-white rounded-lg p-3 shadow-sm">
						<div className="text-2xl font-bold text-purple-600">
							{couple.children?.filter((c) => !c.ownFamily).length || 0}
						</div>
						<div className="text-sm text-gray-600">Ugift</div>
					</div>
					<div className="bg-white rounded-lg p-3 shadow-sm">
						<div className="text-2xl font-bold text-red-600">
							{couple.children?.reduce((total, child) => {
								return total + (child.ownFamily?.children?.length || 0);
							}, 0) || 0}
						</div>
						<div className="text-sm text-gray-600">Børnebørn</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default CoupleChildrenView;
