// Anchor deploy migration. Runs after `anchor deploy`.
// Add post-deploy bootstrapping here (e.g. init_house) if you want it automated.

import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  // Example:
  // const program = anchor.workspace.Vibeflip as anchor.Program;
  // await program.methods.initHouse(...).rpc();
};
