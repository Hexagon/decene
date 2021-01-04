import IPVotes from './ipvotes';

describe('IPv4 voting', () => {
  test('Does not accept local ip', () => {
    // Arrange
    const testIp = '127.0.0.1';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Does not accept private ips (10.x)', () => {
    // Arrange
    const testIp = '10.0.0.1';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Does not accept private ips (172.16.x)', () => {
    // Arrange
    const testIp = '172.16.0.1';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Does not accept private ips (192.168.x)', () => {
    // Arrange
    const testIp = '192.168.1.1';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Do accept public ips (86.x)', () => {
    // Arrange
    const testIp = '86.1.2.3';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(testIp); // False == invalid ip
  });
});

describe('IPv6 voting', () => {
  test('Does not accept local ip', () => {
    // Arrange
    const testIp = '::1';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Does not accept local ip', () => {
    // Arrange
    const testIp = 'fe80::9656:d028:8652:66b6';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(false); // False == invalid ip
  });

  test('Do accept public ips', () => {
    // Arrange
    const testIp = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

    const voter = new IPVotes();

    // Act
    const result = voter.add(testIp);

    // Assert
    expect(result).toEqual(testIp); // False == invalid ip
  });
});

describe('Overall voting', () => {
  test('Do return the valid ip with most votes', () => {
    // Arrange
    const invalidIp1 = '192.168.0.1';
    const validIp1 = '201.1.2.3';
    const validIp2 = '80.1.2.3';
    const voter = new IPVotes();
    voter.add(invalidIp1);
    voter.add(invalidIp1);
    voter.add(invalidIp1);
    voter.add(invalidIp1);
    voter.add(validIp1);
    voter.add(validIp1);
    voter.add(validIp1);
    voter.add(validIp2);

    // Act
    const result = voter.add(validIp2);

    // Assert
    expect(result).toEqual(validIp1);
  });
});
