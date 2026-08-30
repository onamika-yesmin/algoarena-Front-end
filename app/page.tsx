import { SiteHeader } from "./_components/home/SiteHeader";
import { SiteFooter } from "./_components/home/SiteFooter";
import { HomeStats } from "./_components/home/HomeStats";
import { LearningPaths } from "./_components/home/LearningPaths";
import { CallToAction } from "./_components/home/CallToAction";
import { HomeHero } from "./_components/home/HomeHero";
import { EditorSpotlight } from "./_components/home/EditorSpotlight";
import { InterviewSpotlight } from "./_components/home/InterviewSpotlight";
import { ContestSpotlight } from "./_components/home/ContestSpotlight";
import { CommunitySpotlight } from "./_components/home/CommunitySpotlight";
import { PlatformSections } from "./_components/home/PlatformSections";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <HomeHero />

      <HomeStats />

      <EditorSpotlight />

      <LearningPaths />

      <InterviewSpotlight />

      <ContestSpotlight />

      <CommunitySpotlight />

      <PlatformSections />

      <CallToAction />

      <SiteFooter />
    </main>
  );
}
