#!/bin/bash
if [ "$#" -ne 3 ]; then
    echo "usage: $0 name entry node-list"
    exit 1
fi

APP_NAME=$1
entry=$2

exec 4<$3
entriesFound=0
nodeCount=0
# iterate through nodes and count how many nodes have requested index
while read -u4 m; do
    let nodeCount++
    entryFound=$(ssh -n -o ConnectTimeout=5 $m "sudo grep index:${entry}, /opt/${APP_NAME}/journals/ledger" 2>&1)
    if [ -z "$entryFound" ]; then
      echo "index not found"
    else
      let entriesFound++
    fi
done

quorum=$((nodeCount / 2 +1))
echo $quorum

#if quorum is smaller or equal to number of nodes found then we have consensus => do nothing
if [ "$quorum" -lt "$entriesFound" ]; then
  exit 45
fi

finalIndex=$entry
exec 4<$3
echo $finalIndex
# on each node decrement given index to find out what is the smallest index out of all the nodes
while read -u4 m; do
    tempIndex=$entry
    while [ -z $(ssh -o ConnectTimeout=5 $m "sudo grep index:${tempIndex}, /opt/${APP_NAME}/journals/ledger" 2>&1) ]; do
        let tempIndex--
    done
    if [ "$finalIndex" -gt "$tempIndex" ]; then
      let tempIndex++
      finalIndex=$tempIndex
    fi
done
echo $finalIndex
exec 4<$3

# for each node trim the ledger to the smallest index
while read -u4 m; do
    ssh -o ConnectTimeout=5 $m "foam-medusa/bin/trim_node.sh $finalIndex"
done

exec 4<&-
