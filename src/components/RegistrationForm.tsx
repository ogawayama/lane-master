import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchUsersByName, type User } from "@/services/assignmentService";
import { UserPlus, Link2 } from "lucide-react";

interface RegistrationFormProps {
  rfid: string;
  onRegister: (data: { name: string }) => void;
  onLink: (user: User) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function RegistrationForm({ rfid, onRegister, onLink, onCancel, isLoading }: RegistrationFormProps) {
  const [name, setName] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = name.trim();
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const data = await searchUsersByName(query);
      setResults(data);
      setSearched(true);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [name]);

  const handleRegister = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onRegister({ name: trimmed });
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary">Assign User</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          RFID: <span className="font-['Share_Tech_Mono'] text-foreground">{rfid}</span>
        </p>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Type a name to search or register..."
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 h-12 text-lg"
        autoFocus
      />

      <Input
        value={idInput}
        onChange={(e) => setIdInput(e.target.value.replace(/\D/g, "").slice(0, 5))}
        placeholder="5-digit User ID — required for new registration"
        inputMode="numeric"
        maxLength={5}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 h-12 text-lg font-['Share_Tech_Mono']"
      />

      {results.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary p-3"
            >
              <div>
                <p className="font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground font-['Share_Tech_Mono']">ID: {user.id}</p>
              </div>
              <Button size="sm" onClick={() => onLink(user)} disabled={isLoading}>
                <Link2 className="h-4 w-4 mr-1" />
                {isLoading ? "Linking..." : "Link"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {searched && results.length === 0 && name.trim() && (
        <p className="text-center text-sm text-muted-foreground py-2">No existing users found</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 text-lg" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleRegister}
          className="flex-1 h-12 text-lg font-bold"
          disabled={isLoading || !name.trim() || !idInput.trim()}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          {isLoading ? "Registering..." : "Register New"}
        </Button>
      </div>
    </div>
  );
}
