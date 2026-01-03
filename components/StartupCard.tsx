import React from 'react';
import { Startup } from '../types';
import { Globe, DollarSign, Calendar, MapPin, ExternalLink, Users } from 'lucide-react';

interface StartupCardProps {
  startup: Startup;
  onClick: (startup: Startup) => void;
}

export const StartupCard: React.FC<StartupCardProps> = ({ startup, onClick }) => {
  return (
    <div 
      onClick={() => onClick(startup)}
      className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 transition-all duration-300 cursor-pointer backdrop-blur-sm flex flex-col h-full relative overflow-hidden"
    >
      {/* Decorative gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-blue-500/0 group-hover:from-emerald-500/10 group-hover:to-blue-500/10 transition-all duration-500" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
              {startup.name}
            </h3>
            <div className="flex items-center text-xs text-slate-400 mt-1 gap-2">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {startup.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {startup.dateAnnounced}
              </span>
            </div>
          </div>
          <div className="bg-slate-700/50 px-3 py-1 rounded-full border border-slate-600">
            <span className="text-emerald-400 font-bold text-sm">{startup.fundingAmount}</span>
          </div>
        </div>

        <p className="text-slate-300 text-sm mb-4 line-clamp-3 flex-grow">
          {startup.description}
        </p>

        <div className="mt-auto space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {startup.roundType}
              </span>
              {startup.investors.slice(0, 2).map((inv, i) => (
                <span key={i} className="text-xs font-medium px-2 py-1 rounded-md bg-slate-700 text-slate-300">
                   {inv}
                </span>
              ))}
              {startup.investors.length > 2 && (
                 <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-700 text-slate-300">
                   +{startup.investors.length - 2} more
                 </span>
              )}
            </div>
            
            <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                <div className="flex gap-3">
                    {startup.website && <Globe size={14} className="hover:text-white transition-colors"/>}
                    {startup.investors.length > 0 && <Users size={14} className="hover:text-white transition-colors"/>}
                </div>
                <div className="flex items-center gap-1 text-emerald-500 group-hover:translate-x-1 transition-transform">
                    View Details <ExternalLink size={12} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
