import type { PopulatedCouple } from "@/types/simple-family";
import { getLevelBackgroundClass } from "@/types/simple-family-utils";
import CompactPersonCard from "./CompactPersonCard";

interface CompactCoupleCardProps {
	couple: PopulatedCouple;
	level?: number;
	className?: string;
	enableNavigation?: boolean;
}

export function CompactCoupleCard({
	couple,
	level = 0,
	className = "",
	enableNavigation = true,
}: CompactCoupleCardProps) {
	const levelBgClass = getLevelBackgroundClass(level);

	const handleCoupleClick = () => {
		if (enableNavigation) {
			window.location.href = `/couple/${couple.id}`;
		}
	};

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (enableNavigation && (event.key === "Enter" || event.key === " ")) {
			event.preventDefault();
			window.location.href = `/couple/${couple.id}`;
		}
	};

	return (
		<div className={`w-full ${className}`}>
			<div
				className={`p-2 sm:p-3 rounded-lg ${levelBgClass} border border-gray-200 relative`}
				aria-label={
					enableNavigation
						? `View ${couple.person1.firstName}${couple.person2 ? ` and ${couple.person2.firstName}` : ""}'s family`
						: undefined
				}
			>
				<div className="flex items-center justify-center gap-4 sm:gap-6">
					<CompactPersonCard person={couple.person1} enableNavigation={false} />

					{couple.person2 && (
						<CompactPersonCard
							person={couple.person2}
							enableNavigation={false}
						/>
					)}
				</div>

				{/* Absolute positioned couple connection indicator - only show if there are two people */}
				{couple.person2 && (
					<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
						<div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
							<span className="text-white text-sm">💕</span>
						</div>
					</div>
				)}

				{/* Relationship info below the cards */}
				<div className="text-center mt-2 space-y-1">
					<div className="text-xs text-red-600 font-medium capitalize">
						{couple.relationshipType}
					</div>
					{couple.children && couple.children.length > 0 && (
						<div className="text-xs text-gray-600 font-medium">
							{couple.children.length}{" "}
							{couple.children.length === 1 ? "barn" : "børn"}
						</div>
					)}

					{/* "Se familie" button/text - only show if navigation is enabled */}
					{enableNavigation && (
						<div className="mt-3 pt-2 border-t border-gray-200/50">
							<button
								onClick={handleCoupleClick}
								type="button"
								className="w-full bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm hover:bg-blue-700 transition-colors"
							>
								Se familie
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default CompactCoupleCard;
