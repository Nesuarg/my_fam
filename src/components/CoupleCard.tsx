import React from "react";
import PersonCard from "./PersonCard";
import SpouseConnection from "./SpouseConnection";
import type { Couple } from "@/types/hierarchical-family";

interface CoupleCardProps {
	couple: Couple;
	className?: string;
	enableNavigation?: boolean;
}

export function CoupleCard({ couple, className = "", enableNavigation = true }: CoupleCardProps) {
	return (
		<div className={`mb-8 ${className}`}>
			<div className="flex flex-col lg:flex-row items-center justify-center gap-4 max-w-6xl mx-auto">
				<PersonCard person={couple.person1} enableNavigation={enableNavigation} />
				<div className="lg:mx-4">
					<SpouseConnection />
				</div>
				<PersonCard person={couple.person2} enableNavigation={enableNavigation} />
			</div>
		</div>
	);
}

export default CoupleCard;