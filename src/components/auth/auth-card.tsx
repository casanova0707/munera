import Link from "next/link";

type AuthCardProps = {
  title: string;
  children: React.ReactNode;
  footer?: {
    text: string;
    linkText: string;
    href: string;
  };
};

export default function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {title}
        </h1>
        {children}
        {footer && (
          <p className="mt-6 text-center text-sm text-gray-500">
            {footer.text}{" "}
            <Link
              href={footer.href}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {footer.linkText}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
