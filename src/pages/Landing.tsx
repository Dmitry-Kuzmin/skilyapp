import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { AiStudioLanding } from "@/components/landing/AiStudioLanding";

const Landing = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <AiStudioLanding onRequestAccess={() => setAuthModalOpen(true)} />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Landing;
