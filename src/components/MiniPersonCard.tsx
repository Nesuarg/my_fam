import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SimplePerson } from "@/types/simple-family";

interface MiniPersonCardProps {
	person: SimplePerson;
	className?: string;
	onPersonClick?: (person: SimplePerson) => void;
	enableNavigation?: boolean;
}

export function MiniPersonCard({
	person,
	className = "",
	onPersonClick,
	enableNavigation = true,
}: MiniPersonCardProps) {
	const getGenderColor = (gender?: string) => {
		switch (gender) {
			case "male":
				return "bg-blue-50 border-blue-200 text-blue-900";
			case "female":
				return "bg-pink-50 border-pink-200 text-pink-900";
			default:
				return "bg-gray-50 border-gray-200 text-gray-900";
		}
	};

	const getGenderIcon = (gender?: string) => {
		switch (gender) {
			case "male":
				return "👦";
			case "female":
				return "👧";
			default:
				return "👤";
		}
	};

	const handleClick = () => {
		if (onPersonClick) {
			onPersonClick(person);
		} else if (enableNavigation) {
			window.location.href = `/person/${person.id}/children`;
		}
	};

	const cardContent = (
		<CardContent className="p-3 text-center">
			{/* Person Avatar */}
			<div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-white shadow-sm">
				<span className="text-lg">{getGenderIcon(person.gender)}</span>
			</div>

			{/* Name */}
			<div className="mb-2">
				<h4 className="font-bold text-xs leading-tight mb-0.5">
					{person.firstName}
				</h4>
				{person.maidenName && (
					<p className="text-xs text-gray-500 italic">
						(f. {person.maidenName})
					</p>
				)}
			</div>

			{/* Age */}
			<div className="flex justify-center items-center gap-1">
				<Badge
					variant="outline"
					className="text-xs px-1.5 py-0.5 h-auto text-gray-600"
				>
					{person.age}y
				</Badge>
			</div>

			{/* Notes (very condensed) */}
			{person.notes && (
				<div className="mt-2">
					<p className="text-xs text-gray-500 italic" title={person.notes}>
						{person.notes.length > 20
							? `${person.notes.slice(0, 20)}...`
							: person.notes}
					</p>
				</div>
			)}
		</CardContent>
	);

	if (enableNavigation && !onPersonClick) {
		return (
			<a href={`/person/${person.id}/children`} className="block">
				<Card
					className={`w-full max-w-24 h-32 ${getGenderColor(person.gender)} border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer ${className}`}
				>
					{cardContent}
				</Card>
			</a>
		);
	}

	return (
		<Card
			className={`w-full max-w-24 h-32 ${getGenderColor(person.gender)} border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${enableNavigation ? "cursor-pointer" : ""} ${className}`}
			onClick={handleClick}
		>
			{cardContent}
		</Card>
	);
}

export default MiniPersonCard;
