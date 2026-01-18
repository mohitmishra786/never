# typed: false
# frozen_string_literal: true

# Homebrew Formula for Never CLI
# AI constraint engine for Claude, Cursor, and more
class Never < Formula
  desc "AI constraint engine for Claude, Cursor, and more"
  homepage "https://github.com/mohitmishra786/never"
  url "https://registry.npmjs.org/@never/cli/-/cli-1.0.0.tgz"
  sha256 "PLACEHOLDER_SHA256_HASH"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "Never CLI", shell_output("#{bin}/never --version")
  end
end
