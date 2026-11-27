import { Button, Group, Loader, Notification, Space } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Hex, TransactionReceipt } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";

function Confirming({
  hash,
  onConfirmed,
}: {
  hash: Hex;
  onConfirmed: (receipt: TransactionReceipt | null) => void;
}) {
  const { data, status } = useWaitForTransactionReceipt({ hash });

  // Keep the latest callback in a ref so that re-rendering the parent (which
  // typically passes a new inline function) does not re-trigger the effect.
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  });

  // Notify the parent exactly once per transaction. Without this guard the
  // effect re-runs on every parent render while the status is "success", which
  // can repeatedly refetch state and re-render the parent.
  const notified = useRef(false);
  useEffect(() => {
    if (notified.current) {
      return;
    }
    if (status === "success") {
      notified.current = true;
      onConfirmedRef.current(data ?? null);
    } else if (status === "error") {
      notified.current = true;
      onConfirmedRef.current(null);
    }
  }, [data, status]);

  return (
    <Button disabled={true}>
      {status === "pending" && (
        <>
          <Loader color="gray" size="xs" />
          <Space w="sm" />
          Confirming
        </>
      )}
      {status === "success" && "Confirmed"}
      {status === "error" && "Reverted"}
    </Button>
  );
}

function TransactionButton({
  text,
  description,
  disabled,
  onTransaction,
  isPending,
  error,
  onReset,
  onConfirmed,
}: {
  text: string;
  description?: string;
  disabled?: boolean;
  onTransaction: (options: { onSuccess: (hash: Hex) => void }) => void;
  isPending: boolean;
  error: Error | null;
  onReset: () => void;
  onConfirmed?: (receipt: TransactionReceipt) => void;
}) {
  const [hash, setHash] = useState<Hex | null>(null);
  const errorTitle = `Failed to ${description ?? "execute transaction"}`;
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear the pending grace-period timer if the component unmounts.
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const send = useCallback(() => {
    onTransaction({
      onSuccess: (hash) => setHash(hash),
    });
  }, [onTransaction]);

  const confirm = useCallback(
    (receipt: TransactionReceipt | null) => {
      if (receipt) {
        onConfirmed?.(receipt);
      }

      if (receipt?.status === "success") {
        // Set a grace period to linger with the "Confirmed" disabled button.
        // This gives feedback to the user that the transaction succeeded, while
        // preventing the transaction button from "flashing" back to enabled in
        // the time it takes for block chain state to propagate through the app.
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setHash(null), 15000);
      } else {
        setHash(null);
      }
    },
    [onConfirmed],
  );

  return (
    <>
      <Group justify="flex-end">
        {hash ? (
          <Confirming hash={hash} onConfirmed={confirm} />
        ) : (
          <Button disabled={disabled === true || isPending} onClick={send}>
            {text}
          </Button>
        )}
      </Group>
      {error && (
        <Notification color="red" title={errorTitle} onClose={onReset}>
          {error.message}
        </Notification>
      )}
    </>
  );
}

export { TransactionButton };
