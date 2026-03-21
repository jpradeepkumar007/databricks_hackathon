import React, { createContext, useContext, useMemo, useState } from 'react';
import type { DataUIPart } from 'ai';
import type { CustomUIDataTypes } from '@chat-template/core';

interface DataStreamContextValue {
  dataStream: DataUIPart<CustomUIDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
  >;
}

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>(
    [],
  );

  // Wrap setDataStream so we can log incoming parts for debugging image streaming
  const wrappedSetDataStream = useMemo(() => {
    return (updater: React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>) => {
      setDataStream((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        try {
          const added = Array.isArray(next) && Array.isArray(prev) ? next.slice(prev.length) : [];
          if (added.length > 0) {
            // Log concise info about newly added parts
            const concise = added.map((p) => {
              try {
                if ((p as any).type) return { type: (p as any).type };
                return { type: typeof p };
              } catch {
                return { type: 'unknown' };
              }
            });
            console.debug('[DataStream] appended parts', concise);
          }
        } catch (e) {
          // ignore logging errors
        }
        return next as DataUIPart<CustomUIDataTypes>[];
      });
    };
  }, []);

  const value = useMemo(() => ({ dataStream, setDataStream: wrappedSetDataStream }), [dataStream, wrappedSetDataStream]);

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

export function useDataStream() {
  const context = useContext(DataStreamContext);
  if (!context) {
    throw new Error('useDataStream must be used within a DataStreamProvider');
  }
  return context;
}
