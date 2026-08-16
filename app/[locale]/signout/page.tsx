import { signOut } from "../(parent)/actions";
import { SignOutAutoSubmit } from "./AutoSubmit";

export default function SignOutPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-50">
      <form action={signOut} id="signout-form">
        <button
          type="submit"
          className="rounded-xl bg-stone-200 px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-300"
        >
          Signing out…
        </button>
      </form>
      <SignOutAutoSubmit />
    </div>
  );
}
