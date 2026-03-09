import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProCardProps {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  proStartDate?: Date | string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function formatMemberSince(date: Date | string | null | undefined): string {
  if (!date) return "Member since 2024";
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Member since 2024";
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  return `Member since ${months[d.getMonth()]} of ${d.getFullYear()}`;
}

export function ProCard({ 
  username, 
  displayName, 
  avatarUrl, 
  proStartDate,
  className = "",
  size = "md"
}: ProCardProps) {
  const sizeClasses = {
    sm: {
      card: "w-[180px] h-[260px] rounded-2xl",
      logo: "text-3xl",
      avatar: "w-16 h-16",
      name: "text-sm",
      memberSince: "text-[8px]",
      pro: "text-base",
      strip: "w-4 rounded-l-lg",
      padding: "p-3",
    },
    md: {
      card: "w-[240px] h-[340px] rounded-3xl",
      logo: "text-4xl",
      avatar: "w-24 h-24",
      name: "text-base",
      memberSince: "text-[10px]",
      pro: "text-xl",
      strip: "w-6 rounded-l-xl",
      padding: "p-4",
    },
    lg: {
      card: "w-[320px] h-[450px] rounded-3xl",
      logo: "text-5xl",
      avatar: "w-32 h-32",
      name: "text-xl",
      memberSince: "text-xs",
      pro: "text-2xl",
      strip: "w-8 rounded-l-xl",
      padding: "p-6",
    },
  };

  const s = sizeClasses[size];
  const name = displayName || username;

  return (
    <div className={`relative ${s.card} bg-[#0a0a0a] shadow-2xl overflow-hidden ${className}`}>
      {/* Right side strip */}
      <div className={`absolute top-3 bottom-3 right-0 ${s.strip} bg-[#2a2a3a]`} />
      
      {/* Main content */}
      <div className={`relative z-10 h-full flex flex-col ${s.padding}`}>
        {/* OB Logo */}
        <div className="flex-shrink-0 mb-2">
          <span 
            className={`font-logo ${s.logo} font-bold text-white tracking-tight`}
            style={{ fontFamily: "'Soopafresh', 'Black Ops One', sans-serif" }}
          >
            OB
          </span>
        </div>
        
        {/* Profile Picture */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <Avatar className={`${s.avatar} rounded-lg ring-2 ring-[#3a3a4a] bg-[#4a4a5a]`}>
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-[#4a4a5a] text-[#8a8a9a] text-2xl font-bold rounded-lg">
              {username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* User Name */}
          <div className="mt-3 text-center">
            <p 
              className={`${s.name} font-bold text-[#8a8a9a] uppercase tracking-wide`}
              style={{ fontFamily: "'Soopafresh', 'Black Ops One', sans-serif" }}
            >
              {name.length > 15 ? name.slice(0, 15) + "…" : name}
            </p>
            <p className={`${s.memberSince} text-[#5a5a6a] mt-1 tracking-wider`}>
              {formatMemberSince(proStartDate)}
            </p>
          </div>
        </div>
        
        {/* PRO Badge */}
        <div className="flex-shrink-0 flex justify-center mt-auto">
          <span 
            className={`${s.pro} font-black text-white tracking-widest italic`}
            style={{ 
              fontFamily: "'Black Ops One', 'Anton', sans-serif",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)"
            }}
          >
            PRO
          </span>
        </div>
      </div>
    </div>
  );
}

// Downloadable version with higher resolution for sharing
export function ProCardDownloadable({ 
  username, 
  displayName, 
  avatarUrl, 
  proStartDate 
}: Omit<ProCardProps, "className" | "size">) {
  return (
    <ProCard
      username={username}
      displayName={displayName}
      avatarUrl={avatarUrl}
      proStartDate={proStartDate}
      size="lg"
      className="transform-gpu"
    />
  );
}

export default ProCard;
