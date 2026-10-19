import { Routes, Route } from 'react-router-dom';
import ProposalHub from './ProposalHub';
import PreviewFrame from './PreviewFrame';

// Isolated, unauthenticated design-review area. Uses demo data only and makes
// no API calls. Remove this folder plus its single route in App.jsx to drop it.
export default function DesignProposal() {
  return (
    <Routes>
      <Route index element={<ProposalHub />} />
      <Route path="preview" element={<PreviewFrame />} />
    </Routes>
  );
}
