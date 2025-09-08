import React from "react";
import { Heart } from "lucide-react";

interface SpouseConnectionProps {
	className?: string;
}

export function SpouseConnection({ className = "" }: SpouseConnectionProps) {
	return (
		<div className={`flex items-center justify-center ${className}`}>
			{/* Connection line */}
			<div className="flex items-center">
				<div className="w-8 h-0.5 bg-gradient-to-r from-pink-300 to-red-300"></div>
				<div className="mx-2 p-1 rounded-full bg-red-100 border border-red-200">
					<Heart className="w-3 h-3 text-red-500 fill-current" />
				</div>
				<div className="w-8 h-0.5 bg-gradient-to-r from-red-300 to-pink-300"></div>
			</div>
		</div>
	);
}

export default SpouseConnection;