// Voting.jsx
import React, { useState, useEffect } from 'react';
import snapshot from '@snapshot-labs/snapshot.js';
import { Web3Provider } from '@ethersproject/providers';
import MainLayout from '../components/layout/MainLayout';
import SnapshotProposalManager from '../components/SnapshotProposalManager';

const SNAPSHOT_SPACE = 'your-dao.eth';
const client = new snapshot.Client712('https://hub.snapshot.org');

function Voting() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchProposals = async () => {
    try {
      const query = `
        query {
          proposals(
            first: 20,
            where: { space: "${SNAPSHOT_SPACE}" },
            orderBy: "created",
            orderDirection: desc
          ) {
            id
            title
            body
            choices
            start
            end
            snapshot
            state
            author
            scores
            scores_total
            votes
            space {
              id
              name
            }
          }
        }
      `;

      const response = await fetch('https://hub.snapshot.org/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const { data } = await response.json();
      setProposals(data.proposals || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProposal = async (proposalData) => {
    if (!window.ethereum) {
      throw new Error('Web3 wallet required');
    }

    const web3Provider = new Web3Provider(window.ethereum);
    const signer = web3Provider.getSigner();

    const proposal = {
      space: SNAPSHOT_SPACE,
      type: 'single-choice',
      title: proposalData.title,
      body: proposalData.description,
      choices: proposalData.choices,
      start: Math.floor(proposalData.startDate / 1000),
      end: Math.floor(proposalData.endDate / 1000),
      snapshot: await getCurrentBlockNumber(),
      discussion: '',
      plugins: JSON.stringify({}),
      app: 'your-dao-app'
    };

    const receipt = await client.proposal(signer, proposal);
    return receipt;
  };

  const getCurrentBlockNumber = async () => {
    // Спрощена реалізація - можна замінити на реальну
    return Math.floor(Date.now() / 1000);
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout currentUser={currentUser}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <SnapshotProposalManager
            proposals={proposals}
            onCreateProposal={createProposal}
            onVoteSuccess={fetchProposals}
            refreshProposals={fetchProposals}
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default Voting;