import { Conversations } from '@ant-design/x';
import type { Conversation } from '@ant-design/x';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from 'antd';

import { useStudioStrings } from './strings';

export interface StudioConversation extends Conversation {
  key: string;
  label: string;
  group: string;
}

export function ConversationsPanel({
  items,
  activeKey,
  onSelect,
  onCreate,
  onDelete,
}: {
  items: StudioConversation[];
  activeKey: string;
  onSelect: (key: string) => void;
  onCreate: () => void;
  onDelete: (key: string) => void;
}) {
  const t = useStudioStrings();
  return (
    <nav className="ai-convs" aria-label={t.conversations}>
      <Button block icon={<Plus aria-hidden />} onClick={onCreate}>
        {t.newConversation}
      </Button>
      <Conversations
        items={items}
        activeKey={activeKey}
        onActiveChange={onSelect}
        groupable
        menu={(conversation) => ({
          items: [
            {
              key: 'delete',
              label: t.deleteConversation,
              icon: <Trash aria-hidden />,
              danger: true,
              disabled: items.length < 2,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'delete') onDelete(conversation.key);
          },
        })}
      />
    </nav>
  );
}
