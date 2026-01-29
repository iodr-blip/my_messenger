// components/SidebarFirebase.tsx
// Добавь этот новый проп в твой существующий Sidebar.tsx

// В твой интерфейс SidebarProps добавь:
interface SidebarProps {
  chats: Chat[];
  allUsers: User[];  // <- ДОБАВЬ ЭТО
  activeChatId: string | null;
  onChatSelect: (userId: string) => void;  // <- ИЗМЕНЕНО: теперь принимает userId
  activeTab: AppTab;
  onTabSelect: (tab: AppTab) => void;
  currentUser: User;
  onLogout: () => void;
  onChatAction: (action: string, chatId: string) => void;
  onProfileOpen: (mode: 'view' | 'settings') => void;
  showArchived: boolean;
  onToggleArchived: (show: boolean) => void;
}

// В компоненте Sidebar, добавь поиск по всем пользователям:
// После списка чатов добавь:

const [searchQuery, setSearchQuery] = useState('');

const filteredUsers = searchQuery 
  ? allUsers.filter(u => u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  : [];

// В JSX, после списка чатов, добавь:
{searchQuery && filteredUsers.length > 0 && (
  <div className="border-t border-white/5">
    <div className="px-4 py-2 text-xs text-white/40 uppercase tracking-wide">Найдено</div>
    {filteredUsers.map(user => (
      <div
        key={user.id}
        onClick={() => onChatSelect(user.id)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2481cc] to-[#1e5a8e] flex items-center justify-center text-white font-semibold">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          {user.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#17212b]"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{user.username}</h3>
          <p className="text-xs text-white/40 truncate">{user.username_handle}</p>
        </div>
      </div>
    ))}
  </div>
)}
