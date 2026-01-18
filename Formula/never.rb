class Never < Formula
  desc "Never - AI Constraint Guardian"
  homepage "https://github.com/mohitmishra786/never"
  url "https://registry.npmjs.org/@mohitmishra7/never-cli/-/never-cli-0.0.3.tgz"
  sha256 "d0b1b2832548655d67b90e1f9ad4df925d8167a5d549b30e03866f17567b43ed"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/never", "--help"
  end
end
