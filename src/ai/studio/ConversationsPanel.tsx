import { Conversations } from '@ant-design/x';
import type { Conversation } from '@ant-design/x';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from 'antd';

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
  return (
    <nav className="ai-convs" aria-label="Sohbetler">
      <Button block icon={<Plus aria-hidden />} onClick={onCreate}>
        Yeni sohbet
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
              label: 'Sohbeti sil',
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
