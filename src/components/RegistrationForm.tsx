import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchUsersByName, type User } from "@/services/assignmentService";
import { Search, UserPlus, Link2 } from "lucide-react";

interface RegistrationFormProps {
  rfid: string;
  onRegister: (data: { user_id: string; first_name: string; last_name: string }) => void;
  onLink: (user: User) => void;
  onCancel: () => void;
  isLoading: boolean;
}

type Mode = "register" | "link";

export function RegistrationForm({ rfid, onRegister, onLink, onCancel, isLoading }: RegistrationFormProps) {
  const [mode, setMode] = useState<Mode>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    const generatedId = `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    onRegister({ user_id: generatedId, first_name: firstName.trim(), last_name: lastName.trim() });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searching) return;
    setSearching(true);
    try {
      const results = await searchUsersByName(searchQuery.trim());
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary">
          {mode === "register" ? "Register New User" : "Link Existing User"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          RFID: <span className="font-['Share_Tech_Mono'] text-foreground">{rfid}</span>
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="h-4 w-4" /> New User
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            mode === "link"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 className="h-4 w-4" /> Link Existing
        </button>
      </div>

      {mode === "register" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-muted-foreground">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 h-12 text-lg"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-muted-foreground">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name (optional)"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 h-12 text-lg"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 text-lg" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12 text-lg font-bold" disabled={isLoading || !firstName.trim()}>
              {isLoading ? "Registering..." : "Register & Assign"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name..."
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 h-12 text-lg"
              autoFocus
            />
            <Button type="button" onClick={handleSearch} disabled={searching || !searchQuery.trim()} className="h-12 px-4">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary p-3"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-['Share_Tech_Mono']">
                      ID: {user.user_id}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onLink(user)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Linking..." : "Link"}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}

          <div className="pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full h-12 text-lg" disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
