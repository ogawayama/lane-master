import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegistrationFormProps {
  rfid: string;
  onRegister: (data: { user_id: string; first_name: string; last_name: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function RegistrationForm({ rfid, onRegister, onCancel, isLoading }: RegistrationFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    const generatedId = `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    onRegister({ user_id: generatedId, first_name: firstName.trim(), last_name: lastName.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary">Register New User</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          RFID: <span className="font-['Share_Tech_Mono'] text-foreground">{rfid}</span>
        </p>
      </div>

      <div className="space-y-3">
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
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-12 text-lg"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 text-lg font-bold"
          disabled={isLoading || !firstName.trim()}
        >
          {isLoading ? "Registering..." : "Register & Assign"}
        </Button>
      </div>
    </form>
  );
}
