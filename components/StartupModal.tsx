import React from 'react';
import { Startup } from '../types';
import { X, Globe, Mail, Linkedin, Twitter, ExternalLink, ArrowUpRight, Copy, Send } from 'lucide-react';

interface StartupModalProps {
  startup: Startup | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StartupModal: React.FC<StartupModalProps> = ({ startup, isOpen, onClose }) => {
  if (!isOpen || !startup) return null;

  const handleOutreach = () => {
    // Smart Email Draft Generation
    const founderName = startup.founders[0]?.split(' ')[0] || "Founding Team";
    const subject = encodeURIComponent(`Quick question re: ${startup.name} / Partnership`);
    const body = encodeURIComponent(
`Hi ${founderName},

I saw the recent news about ${startup.name} and what you're building in the ${startup.tags[1] || 'tech'} space. The approach to ${startup.description.toLowerCase().slice(0, 50)}... caught my eye.

I'm exploring potential synergies in this domain and would love to connect.

Best,
[Your Name]`
    );
    
    // Prioritize contact email, then fallback to generic
    const emailTo = startup.contactEmail || "founders@" + (new URL(startup.website || "http://example.com").hostname.replace('www.', ''));
    
    window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#0A0A0A] border border-[#333] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex justify-between items-start bg-[#0A0A0A] sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">{startup.name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="px-2 py-0.5 rounded border border-[#333] bg-[#111] text-[#999] text-xs font-medium">
                    {startup.roundType}
                </span>
                <span className="text-[#666] font-mono text-xs">
                   {startup.fundingAmount}
                </span>
                <span className="text-[#444] text-xs">
                    {startup.dateAnnounced}
                </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#222] rounded-md text-[#666] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
            
            {/* Description */}
            <section>
                <h3 className="text-[10px] font-bold text-[#444] uppercase tracking-wider mb-3">About</h3>
                <p className="text-[#ccc] text-sm leading-6 font-light">
                    {startup.description}
                </p>
                {startup.investors.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                         {startup.investors.map((inv, i) => (
                             <span key={i} className="text-[10px] text-[#666] px-2 py-1 bg-[#111] border border-[#222] rounded">
                                 {inv}
                             </span>
                         ))}
                    </div>
                )}
            </section>

            {/* Founders */}
            <section>
                 <h3 className="text-[10px] font-bold text-[#444] uppercase tracking-wider mb-3">Founders</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {startup.founders && startup.founders.length > 0 ? (
                        startup.founders.map((founder, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded border border-[#222] bg-[#0F0F0F] hover:border-[#444] transition-colors group">
                                <span className="text-sm text-[#eee] font-medium">{founder}</span>
                                <button 
                                    onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(founder + " " + startup.name)}`, '_blank')}
                                    className="text-[#444] group-hover:text-white transition-colors"
                                >
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                        ))
                     ) : (
                        <div className="text-[#444] text-xs italic">Researching founder details...</div>
                     )}
                 </div>
            </section>

            {/* Actions / Links */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {startup.website && (
                    <a href={startup.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-2 rounded bg-white text-black text-sm font-medium hover:bg-[#ddd] transition-colors">
                        <Globe size={14} />
                        Website
                    </a>
                )}
                <button 
                    onClick={handleOutreach}
                    className="flex items-center justify-center gap-2 p-2 rounded border border-[#333] bg-[#111] text-emerald-500 text-sm font-medium hover:bg-[#222] hover:border-emerald-900 transition-colors"
                >
                    <Send size={14} />
                    Draft Outreach
                </button>
            </section>
            
            {/* Socials Row */}
            <section className="flex items-center gap-4 pt-4 border-t border-[#222]">
                {startup.socialLinks?.linkedin && (
                    <a href={startup.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-[#666] hover:text-white transition-colors">
                        <Linkedin size={18} />
                    </a>
                )}
                {startup.socialLinks?.twitter && (
                    <a href={startup.socialLinks.twitter} target="_blank" rel="noreferrer" className="text-[#666] hover:text-white transition-colors">
                        <Twitter size={18} />
                    </a>
                )}
                 <div className="ml-auto text-[10px] text-[#444]">
                    ID: {startup.id.split('-')[1]}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};