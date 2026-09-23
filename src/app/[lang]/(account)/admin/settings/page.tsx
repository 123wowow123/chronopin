import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { getMultilingual, getPersonalBag, getSliderTyping, getTagList, getTimelineVideo } from '@/server/model/appSetting';
import UserWiki from '@/server/model/userWiki';
import { AdminTabs } from '../AdminTabs';
import { MultilingualForm } from './MultilingualForm';
import { PersonalBagForm } from './PersonalBagForm';
import { SliderTypingForm } from './SliderTypingForm';
import { TagListForm } from './TagListForm';
import { TimelineVideoForm } from './TimelineVideoForm';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin settings' };

// The site-wide switches for what visitors see: the cards, the filters, and
// how a crowded day picks its pins. Each saves on its own, straight away.
export default async function AdminSettingsPage() {
  await requireAdminViewer('/admin/settings');
  const [video, typing, tagList, personal, wikis, multilingual] = await Promise.all([
    getTimelineVideo(),
    getSliderTyping(),
    getTagList(),
    getPersonalBag(),
    UserWiki.count(),
    getMultilingual(),
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/settings" />
      <h1 className="sr-only">Settings</h1>
      <TimelineVideoForm saved={video} />
      <SliderTypingForm saved={typing} />
      <TagListForm saved={tagList} />
      <PersonalBagForm saved={personal} wikis={wikis} />
      <MultilingualForm saved={multilingual} />
    </div>
  );
}
